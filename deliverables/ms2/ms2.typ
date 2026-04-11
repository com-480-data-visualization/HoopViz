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

To implement our visualization project, we plan on using a standard technical stack.
We will be using #link("https://d3js.org/")[D3.js] for the graphs visualization and custom HTML, CSS and vanilla JavaScript for the bubbles visualization and other non-standard graphs.

Additionally our website will be static, built and deployed automatically to GitHub pages hosting using a Continuous Integration/Deployment script.

== Relevant Lectures

Most lectures will be very relevant for our implementation.
However, the following lectures are the most important for our project: 4.1 Data, 4.2 D3.js, 5.1 & 5.2 Interactivity, 7.1 Design for data viz, 7.2 Do's and don’ts, 10 Graph visualization, 12.1 Storytelling.

== Minimal Viable Product

Our minimal viable product will consist of an implementation of all our features listed in the _Main Goals_ section.
It will mostly consist of the teams and players main landing page and its bubbles map visualization supporting scrolling and panning, with customizable metrics and detailed statistics on click.

*Functional project prototype*: #link("https://com-480-data-visualization.github.io/HoopViz/")

== Sketches

The sketches below aim to illustrate the content of the final website.
There will be two bubbles map, that share the same look, one for teams and one for players.
From there, the user can pan around and explore the data through the position and sizes of each bubble.
When they want to learn more about a specific bubble, they can click on it and they will be shown a full screen dashboard about the bubble they clicked, containing multiple visualizations.
Additionally, we can clearly see the time machine slider at the top of every page that will let the user explore all of what they are currently seeing across all the available NBA seasons, as well as see animated transitions of the evolution for each team and player, across all visualizations.

#align(center)[
  #image("images/sketches.png", width: 100%)
]
