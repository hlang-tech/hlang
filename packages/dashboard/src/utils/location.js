export default (location = window.location, param) => {
  const match = location.hash.match(`.*[?|&]${param}=(.*?)(&|$)`) 

  return match && decodeURIComponent(match[1])
}
