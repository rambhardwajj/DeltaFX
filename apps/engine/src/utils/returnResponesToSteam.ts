import { publisherClient } from "..";

export function returnResponseToStream(
  stream: string,
  success: boolean,
  message: string,
  status: number,
  data: any
) {
  publisherClient.xAdd(stream, "*", {
    data: JSON.stringify({
      success: success,
      responseMessage: message,
      status: status,
      data: data,
    }),
  });
}