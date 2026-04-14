export function updateTeamStats(container, dataLoader, currentYear, currentItem) {
  const name = container.querySelector(".name");
  const year = container.querySelector(".year");

  name.innerText = currentItem;
  year.innerText = currentYear;

  console.log(currentItem + currentYear);
}

export function updatePlayerStats() {
  // TODO later when we have players bubble map
}
