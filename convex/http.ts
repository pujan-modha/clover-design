import { httpRouter } from "convex/server";
import { chatPOST } from "./chat/post.route";

const http = httpRouter();

http.route({
  path: "/chat/projects/:projectId/generate",
  method: "POST",
  handler: chatPOST,
});

export default http;
