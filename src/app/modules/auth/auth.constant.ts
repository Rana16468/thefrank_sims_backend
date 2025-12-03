export interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

export interface ProfileUpdateResponse {
  status: boolean;
  message: string;
}


export const user_search_filed:string[]=[]
