export function getUrls() {
  return {
    apiUrl: `http://localhost:${process.env.REACT_APP_BACKEND_PORT}/api`,
    vizApiUrl: `http://localhost:${process.env.REACT_APP_BACKEND_PORT}/viz_api`
  }
}