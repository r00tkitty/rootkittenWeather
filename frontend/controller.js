async function getDays() { 
  const res = await fetch('http://127.0.0.1:6767/api/controller/days');
  const data = await res.json();
  alert(`There are ${data.days} days in the input file.`);
}

async function runAuto() {
  await fetch('http://127.0.0.1:6767/api/controller/auto', { method: 'POST' });
  alert('Auto calculation done.');
  refreshOutput();
}

async function overwrite() {
  const fd = new FormData();
  fd.append('date', document.getElementById('date').value);
  fd.append('system', document.getElementById('system').value);
  fd.append('value', document.getElementById('value').value);

  const res = await fetch('http://127.0.0.1:6767/api/controller/overwrite', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.result === 0) {
  alert("Updated successfully!");
} else if (data.result === -1) {
  alert("Date not found.");
} else if (data.result === -3) {
  alert("Invalid input value or system number.");
} else {
  alert("Unknown error occurred.");
}
  refreshOutput();
}

async function refreshOutput() {
  const res = await fetch('http://127.0.0.1:6767/api/controller/output');
  const data = await res.json();
  document.getElementById('output').textContent = data.lines.join('\n') || 'No data.';
}



document.getElementById("uploadForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById("fileInput");
    if (!fileInput.files.length) {
        document.getElementById("uploadResult").textContent = "No file selected.";
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const res = await fetch("http://127.0.0.1:6767/api/controller/upload", {
            method: "POST",
            body: formData,
        });
        const data = await res.json();
        document.getElementById("uploadResult").textContent = data.message || "Upload Complete.";
    } catch (err) {
        console.error(err);
        document.getElementById("uploadResult").textContent = "Upload failed.";
    }
});
