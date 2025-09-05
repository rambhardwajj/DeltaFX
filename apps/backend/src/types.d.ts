export type decodedUser = {
    email: string, 
    id: string,
}
declare global {
  namespace Express {
    interface Request {
      user: decodedUser
    }
  }
}