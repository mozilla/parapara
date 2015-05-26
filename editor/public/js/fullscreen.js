document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("burgerbutton").addEventListener("click", function() {
    if ($('div.tool-box').css('display') === "none") {
      showTool();
    } else {
      hideTool();
    }
  });
  document.getElementById("burgerbutton").addEventListener("mousemove", function(e) {
    if (e.buttons === 1) {
      $('#burgerbutton').css("left", e.clientX - 25).css("top", e.clientY - 25);
    }
  });
});

function hideTool() {
  $('div.tool-box').css("display", "none");
  $('div.film-strip').css("display", "none");
}

function showTool() {
  $('div.tool-box').css("display", "block");
  $('div.film-strip').css("display","block");
}
