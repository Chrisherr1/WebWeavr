// Returns a helper that writes SSE-formatted events to the response stream.
// Each event follows the format: "event: <name>\ndata: <json>\n\n"
export function createSender(res) {
  return function (event, data) {
    res.write('event: ' + event + '\n');
    res.write('data: ' + JSON.stringify(data) + '\n\n');
  };
}
