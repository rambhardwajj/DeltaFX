import { redisConsumer } from "../config/redisConsumer";
import { CustomError } from "./CustomError";

const idPromseMap = new Map<string, (value: any) => any>();

let startLoop = false;
let offset = "$";

export type EngineResponse<T = any> = {
  id: string;                 
  success: boolean;           
  status: number;
  message?: string;           
  data?: T;      
}             

async function runLoop() {
  while (idPromseMap.size > 0) {
    console.log("inSide runLoop");
    try {
      const res = await redisConsumer.xRead({
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

      if( !data) continue;

      const id = data.data.id;  // yahan pe data.data.id aaega after updation of response schema 
      if( !id) continue;

      if (idPromseMap.has(id)) {
        idPromseMap.get(id)!(data);
        idPromseMap.delete(id);
      }else
        continue;
        
    } catch (error) {
      console.log(error);
      for (let [id, resolve] of idPromseMap.entries()) {
          resolve({ error: "Processing failed" });
      }
      idPromseMap.clear();

    }
  }
  startLoop = false;
}

export const waitForId = async (id: string): Promise<EngineResponse> => {
  const newPromise : Promise<EngineResponse> = new Promise((resolve, reject) => {
    if (idPromseMap.has(id)) {
      reject(new CustomError(504, "No id found"));
      return;
    }
    
    idPromseMap.set(id, resolve);
    setTimeout(() => {
      idPromseMap.delete(id);
      reject(new CustomError(504, "Engine did not respond in time"));
    }, 5000);
  });

  if (!startLoop && idPromseMap.size === 1) {
    startLoop = true;
    runLoop();
  }
  return newPromise;
};
