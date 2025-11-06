import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";

@Injectable({ providedIn: "root" })
export class ChatService {
  constructor(private http: HttpClient) {}
  listThreads(){ return this.http.get<any[]>(environment.API_BASE + environment.PATHS.threads_list); }
  lastActive(){ return this.http.get<any>(environment.API_BASE + environment.PATHS.threads_last); }
  getThread(id:string){ return this.http.get<any>(environment.API_BASE + environment.PATHS.thread_by_id(id)); }
  sendMessage(threadId:string|null, content:string){
    return this.http.post<any>(environment.API_BASE + environment.PATHS.messages, { threadId, content });
  }
}
