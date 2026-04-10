#set document(date: none)

#let textSize = 10pt
#set text(
  font: "inter",
  size: textSize,
)

#set page(
  "a4",
  margin: (top: 2cm, bottom: 1.5cm, x: 1.5cm),
  header: context [
    HoopViz
    #h(1fr)
    Milestone 2 #counter(page).display("(1/1)", both: true)
    #h(1fr)
    324724, 374212, 375535
    #v(-2pt)
    #line(length: 100%, stroke: 0.6pt)
  ],
)

#show heading.where(level: 1): set text(size: textSize + 10pt, weight: "semibold")
#show heading.where(level: 2): set text(size: textSize + 8pt, weight: "semibold")
#show heading.where(level: 3): set text(size: textSize + 6pt, weight: "semibold")
#show heading: set block(above: textSize - 1pt, below: textSize*2)

= HoopViz - Milestone 2

TODO
