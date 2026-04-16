#set document(date: none)

#let textSize = 10pt
#set text(
  font: "inter",
  size: textSize,
)

#set page(
  "a4",
  margin: (top: 1.8cm, bottom: 1cm, x: 1cm),
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

#v(1fr)
#align(center)[
  #image("images/basketball.png", width: 90%)
]
#v(1fr)

#v(20pt)

#pagebreak()

== Project Goals

This document builds on the initial project description we submitted for Milestone 1 (#link("https://github.com/com-480-data-visualization/HoopViz/tree/main/deliverables/ms1/ms1.md")).

=== Main Goals

The goal of the HoopViz project is to build a beautiful visualization website to share insights about years of NBA data in a playful, dynamic and interactive way.
By using multiple seasons of data, we are building a "time‑traveling" experience where users can slide through history to see how the league has evolved over the years with interesting transitions.

- *Bubble map* landing page - Upon loading our website, the user will land on a bubble representation of the teams in the NBA. They will be scattered on a map along three axis: x axis, y axis, and a bubble size axis. The user will be able to select a specific attribute of interest for each axis (like number of wins, three points percentage, etc) in order to create a custom map visualization with chosen statistics. There will be one bubble map for teams, and one bubble map for players. When clicking on a specific bubble, a window will open to reveal precise charts and additional visualizations related to the bubble of interest in a dashboard fashion.
- *Team stats* - The team charts window will show the following visualizations: general team metadata (logo, name, etc), a radar chart with customizable attributes of interests to see the team's type of playing, two lists of teams representing their worst enemies and their easiest opponents, and a season evolution chart displaying the evolution of 2 key attributes (also user customizable) over the course of the selected season.
- *Player stats* - The player charts window will show the following visualizations: general player metadata (picture, name, etc), list of teams the player played in for that season, a radar chart with customizable attributes of interests to see the player's type of playing, a court shot visualization, a game by game analysis where each point represents a game (colored by if they lost or won and how important they were in the game) with hover effect to display additional game stats, and a general games stats summary over the whole season.
- *Time machine slider* - At the top of all these pages there will be a year slider. At any given point the user can jump to any NBA season of their liking and see the current data they were looking at evolve with transitions to match the newly chosen target season. This will really bring the whole website to life and allow users to gain key insights about how their data of interest evolved over the years.

*Note*: check out the _Sketches_ section together with the description above for a more comprehensive overview.

=== Extra Ideas

We have many additional ideas we wish to implement if time allows: improved interactivity with hovering effect on data points (like on bubbles, on spider charts, game by game data, etc) to show detailed stats and provide UI filtering features (like filter court shots to only show shots for the hovered game), team and player badges on their dashboard page (show if they were MVP, top shooter, etc), a Playoff season toggle to show data from the Playoffs and not only the NBA Regular Season, responsive design to make the website work on mobile devices, and live data acquisition and display to see real time teams and players data during the actual games.

== Tools

To implement our visualization project, we plan on using a standard technical stack.
We will be using #link("https://d3js.org/")[D3.js] for the visualizations in the dashboards; and regular HTML, CSS and vanilla JavaScript for the bubbles visualization and other non-standard graphs.
We will use CSV files for our data representation with a JS data loader system.

Additionally our website will be static, built and deployed automatically to GitHub pages hosting using a Continuous Integration/Deployment workflow script.

== Relevant Lectures

Most lectures will be very relevant for our implementation.
However, the following lectures are the most important for our project: 4.1 Data, 4.2 D3.js, 5.1 & 5.2 Interactivity, 7.1 Design for data viz, 7.2 Do's and don’ts, 10 Graph visualization, 12.1 Storytelling.

== Minimal Viable Product

The minimal viable product will consist of an implementation of all the features listed in the _Main Goals_ section.
It will mostly consist of the teams and players bubble maps landing pages visualizations, supporting scrolling and panning, with customizable metrics and detailed statistics on click.

Our project demo is already live and is now connected to our real data.
It currently features the bubble map for teams with support for custom axis on click (for bubble size, x position and y position), zoom, and panning.
Behind the scenes we implemented the data loader system in JavaScript pulling all our data from CSV files.
We can already deeply explore our data and gather insights through the team bubble map.
The time back machine slider at the top of the page is already working too, allowing the user to go back in time and see the team bubbles evolve over time with nice transitions.
On click on a bubble we have a dedicated window that opens up to reveal what will be specific charts and team stats in the future, already updating live with the years slider though.
Basically everything we need is there, most JavaScript utilities are now written, and we have a solid foundation to keep working on our implementation!

Check out our *Functional Project Prototype* (use a chromium desktop browser):\
#link("https://com-480-data-visualization.github.io/HoopViz/")

== Sketches

The sketches below aim to illustrate the content of the final website.
There will be two bubbles map, that share the same look, one for teams and one for players.
From there, the user can pan around and explore the data through the position and sizes of each bubble.
When they want to learn more about a specific bubble, they can click on it and they will be shown a full screen dashboard about the bubble they clicked, containing multiple visualizations.
Additionally, we can clearly see the time machine slider at the top of every page that will let the user explore everything they are currently seeing across all the available NBA seasons through animated transitions, beautifully showing the evolution for each team and player over time.

#align(center)[
  #image("images/sketches.png", height: 1fr)
]
