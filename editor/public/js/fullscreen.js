var EditorUI = EditorUI || {};
EditorUI.FullScreen = EditorUI.FullScreen || {};
var toolbox;
var filmstrip;
var burgerbutton;
document.addEventListener("DOMContentLoaded", function() {
  toolbox = document.getElementsByClassName("tool-box")[0];
  filmstrip = document.getElementsByClassName("film-strip")[0];
  burgerbutton = document.getElementById("burgerbutton");
  burgerbutton.addEventListener("click", function() {
    if (toolbox.style.display === "none" || toolbox.style.display === "") {
      EditorUI.FullScreen.showTool();
    } else {
      EditorUI.FullScreen.hideTool();
    }
  });
  burgerbutton.addEventListener("mousemove", function(e) {
    if (e.buttons === 1) {
      burgerbutton.style.left = (e.clientX - 25) + "px";
      burgerbutton.style.top = (e.clientY - 25) + "px";
    }
  });
});

EditorUI.FullScreen.hideTool = function() {
  toolbox.style.display = "none";
  filmstrip.style.display = "none";

  burgerbutton.style.display = "block";
}

EditorUI.FullScreen.showTool = function() {
  toolbox.style.display = "block";
  filmstrip.style.display = "block";

  burgerbutton.style.display = "none";
}
