#set document(date: none)

#let textSize = 10pt
#set text(
  font: "inter",
  size: textSize,
)

#set page(
  "a4",
  margin: (top: 2.3cm, bottom: 1.5cm, x: 1.5cm),
  header: context [
    #if here().page() != 1 [
      #grid(
        columns: (1fr, 1fr, 1fr),
        align(left)[HoopViz],
        align(center)[Milestone 2 #counter(page).display((cur, total) => [(#(cur - 1)/#(total - 1))], both: true)],
        align(right)[324724, 374212, 375535],
      )
      #v(-4pt)
      #line(length: 100%, stroke: 0.6pt)
    ]
  ],
)

#show heading.where(level: 1): set text(size: textSize + 10pt, weight: "semibold")
#show heading.where(level: 2): set text(size: textSize + 8pt, weight: "semibold")
#show heading.where(level: 3): set text(size: textSize + 6pt, weight: "semibold")
#show heading: set block(above: textSize + 6pt, below: textSize + 2pt)

#v(1fr)
#align(center)[
  #image("images/basketball.png", width: 90%)
  #text(size: 8pt, fill: gray.darken(20%))[
    #link("https://sports.yahoo.com/nba-official-game-balls-wilson-190540763.html")
  ]
]
#v(1fr)

#pad(
  x: 1cm,
)[
  #text(size: textSize + 15pt, weight: "bold")[HoopViz]
  #v(-0.3cm)
  #text(size: textSize + 8pt, weight: "bold")[COM-480 - Data Visualization - Milestone 2]
  #v(-0.1cm)
  #text(size: textSize + 4pt, weight: "bold")[2026 / 04 / 14]
  #v(15pt)
  #text(size: textSize + 4pt)[
    Lucas Jung	(324724)\
    Anasse El Boudiri	(374212)\
    Sam Lee	(375535)
  ]
]

#v(10pt)

#pagebreak()

== Project Goals

TODO

=== Main Goals

=== Extra Ideas

== Tools

== Relevant Lectures

== Minimal Viable Product

== Sketches
