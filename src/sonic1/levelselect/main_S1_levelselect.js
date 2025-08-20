function openCode(event, assemblerName) {
  document.querySelectorAll(".tabcontent,.tablink").forEach(el => {
    el.classList.remove("active");
  });

  event.target.classList.add("active");
  document.querySelector(assemblerName).classList.add("active");

  document.querySelector("#clipboard").value = "Copy to clipboard";
} 

document.querySelector("#clipboard").onclick = (el) => {
  copyToClipboard(el.target, document.querySelector(".tabcontent.active .codebox"), false);
};