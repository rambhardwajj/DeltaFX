import { redisConsumer } from "../config/redisConsumer";
import { CustomError } from "./CustomError";

const idPromseMap = new Map<string, (value: any) => any>();

let startLoop = false;
let offset = "$";

async function runLoop() {
  while (idPromseMap.size > 0) {
    console.log("inSide runLoop");
    try {
      const res = await redisConsumer.xRead(
        {
          key: "return-stream",
          id: offset,
        },
        {
          BLOCK: 0,
          COUNT: 1,
        }
      );

      if (!res) continue;

      // @ts-ignore
      const { name, messages } = res[0];
      const data = JSON.parse(messages[0].message.data);
      console.log("QUEUE WORKER : ",data);
      // if (!data) continue;

      if( !data){
        continue;
      }

      const id = data.data.id;// yahan pe data.data.id aaega after updation of response schema 
      if( !id)
        continue;

      if (idPromseMap.has(id)) {
        idPromseMap.get(id)!(data);
        idPromseMap.delete(id);
      }else{
        continue;
      }
    } catch (error) {
      console.log(error);
      // Clean up failed promises
      for (let [id, resolve] of idPromseMap.entries()) {
          resolve({ error: "Processing failed" });
      }
      idPromseMap.clear();

    }
  }
  startLoop = false;
}

export const waitForId = async (id: string) => {
  const newPromise = new Promise((resolve, reject) => {
    if (idPromseMap.has(id)) {
      reject(null);
      return;
    }
    
    idPromseMap.set(id, resolve);
    setTimeout(() => {
      idPromseMap.delete(id);
      reject(null);
    }, 5000);
  });

  if (!startLoop && idPromseMap.size === 1) {
    startLoop = true;
    runLoop();
  }
  return newPromise;
};
