const colorful = {
  'ALIZARIN': "#e74c3c",
  'AMETHYST': "#9b59b6",
  'ASBESTOS': "#7f8c8d",
  'BELIZE_HOLE': "#2980b9",
  'CARROT': "#e67e22",
  'CLOUDS': "#ecf0f1",
  'CONCRETE': "#95a5a6",
  'EMERALD': "#2ecc71",
  'GREEN_SEA': "#16a085",
  'MIDNIGHT_BLUE': "#2c3e50",
  'NEPHRITIS': "#27ae60",
  'ORANGE': "#f39c12",
  'PETER_RIVER': "#3498db",
  'POMEGRANATE': "#c0392b",
  'PUMPKIN': "#d35400",
  'SILVER': "#bdc3c7",
  'SUN_FLOWER': "#f1c40f",
  'TURQUOISE': "#1abc9c",
  'WET_ASPHALT': "#34495e",
  'WISTERIA': "#8e44ad"
}

export const getRandomColor = () => {
  const index = Object.keys(colorful);
  const colors = index.length;
  const random = Math.floor(Math.random(100) * colors);


  return colorful[index[random]];
}

export default colorful;