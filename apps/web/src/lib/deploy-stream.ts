export function createDeployStreamParser(onLog: (text: string) => void) {
  let buffer = "";
  let logs = "";
  let completionSeen = false;
  let succeeded = false;

  const parseFrame = (frame: string) => {
    const data = frame.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
    if (!data) return;
    try {
      const event = JSON.parse(data);
      if (event.event === "completed") {
        completionSeen = true;
        succeeded = event.ok === true && event.provider_status === "success";
        return;
      }
      const text = event.text || event.error || "";
      if (typeof text === "string" && text) {
        logs += text;
        onLog(text);
      }
    } catch {
      logs += data;
      onLog(data);
    }
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() || "";
      frames.forEach(parseFrame);
    },
    finish() {
      if (buffer.trim()) parseFrame(buffer);
      buffer = "";
      return { logs, succeeded: completionSeen && succeeded };
    },
  };
}
