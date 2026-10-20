// Sources listed in the Sources dialog: the same 15 entries as SPEC.md "Sources".
// Each entry: [citation, url, what the sim uses it for]. test/sources.test.mjs checks this against SPEC.md.
// Loaded as a classic <script> in the built page (globals) and with require() in Node tests.

const SOURCES = [
  ["Vandermarlière, J. (2016). On the inflation of a rubber balloon. The Physics Teacher 54, 566.", "https://physlab.org/wp-content/uploads/2023/01/1.4967901.pdf", "Balloon pressure peaks near 3% above room pressure, then falls; lower pressure while deflating."],
  ["Merritt, D. R. and Weinhaus, F. (1978). The pressure curve for a rubber balloon. American Journal of Physics 46, 976.", "https://eric.ed.gov/?id=EJ193106", "Theory of how balloon pressure changes with size."],
  ["NASA Glenn Research Center. Rocket Thrust Equation.", "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-thrust-equation/", "Thrust equals mass flow times exit speed, plus a pressure term."],
  ["NASA Glenn Research Center. Drag Equation.", "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/", "Air resistance grows with speed squared and frontal area."],
  ["NASA Glenn Research Center. Shape Effects on Drag.", "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/shape-effects-on-drag/", "Drag coefficient of a sphere (0.07 to 0.5)."],
  ["NASA Glenn Research Center. Flight Equations with Drag.", "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/flight-equations-with-drag/", "How drag slows a moving object over time."],
  ["Engineering ToolBox. Orifice, Nozzle and Venturi Flow Rate Meters.", "https://www.engineeringtoolbox.com/orifice-nozzle-venturi-d_590.html", "Flow through an opening; discharge coefficient of about 0.6."],
  ["Balloons Wiki. Balloon Pumps.", "https://balloons.fandom.com/wiki/Balloon_Pumps", "How much air different hand pumps move per stroke."],
  ["NASA JPL Education. Simple Rocket Science Continued (lesson plan).", "https://www.jpl.nasa.gov/edu/resources/lesson-plan/simple-rocket-science-continued/", "Classroom version of this investigation: amount of air vs distance."],
  ["Science World. Balloon Rockets.", "https://www.scienceworld.ca/resource/balloon-rockets/", "Classroom setup with a 3 m string."],
  ["FLEET. Balloon rocket home-science experiment.", "https://archive.fleet.org.au/blog/balloon-rocket/", "Setup with a 7 to 8 m string; repeat trials."],
  ["Science Friday. Balloon Rockets.", "https://www.sciencefriday.com/educational-resources/balloon-rockets/", "Why escaping air pushes the balloon (Newton’s third law)."],
  ["NGSS Lead States. MS-PS2-2 evidence statement.", "https://www.nextgenscience.org/sites/default/files/evidence_statement/black_white/MS-PS2-2%20Evidence%20Statements%20June%202015%20asterisks.pdf", "Standard this investigation supports."],
  ["Shafranovich, Y. (2005). RFC 4180: Common Format and MIME Type for CSV Files.", "https://www.rfc-editor.org/rfc/rfc4180.html", "Format of the data file."],
  ["Rows. How to import CSV files in Google Sheets.", "https://rows.com/blog/post/import-csv-google-sheets", "Steps for opening the data file in Google Sheets."]
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SOURCES };
}
