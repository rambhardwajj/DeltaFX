import { createClient } from "redis";

const subscriberClient = createClient({
    url: "redis://localhost:6379"
})

async function connectSubscriber(){
    try {
        await subscriberClient.connect();
    } catch (error) {
        console.log("error in connecting to subscriber", error)
    }
}

connectSubscriber();

subscriberClient.on("error", (err) =>{
    console.error(err)
})






