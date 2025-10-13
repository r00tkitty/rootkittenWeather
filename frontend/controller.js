async function getDays() { 
  try {
    const res = await fetch('http://127.0.0.1:8000/api/controller/days');
    if (!res.ok) throw new Error('input file not found');
    const data = await res.json();
    if (data.result === -1) {
      alert('Error: input file not found.');
    } else {
      alert(`There are ${data.days} days in the input file.`);
    }
  } catch (err) {
    alert('Error: input file not found.');
  }
}

async function runAuto() {
  try {
    const res = await fetch('http://127.0.0.1:8000/api/controller/auto', { method: 'POST' });
    if (!res.ok) throw new Error('input file not found');
    const data = await res.json();
    if (data.status === 'ok') {
      alert('Auto calculation done.');
      refreshOutput();
    } else if (data.status === 'error') {
      alert('Error: ' + (data.message || 'auto calculation failed.'));
    } else {
      alert('Unknown response from server.');
    }
  } catch (err) {
    alert('Error: input file not found.');
  }
}

async function overwrite() {
  const fd = new FormData();
  fd.append('date', document.getElementById('date').value);
  fd.append('system', document.getElementById('system').value);
  fd.append('value', document.getElementById('value').value);
  try {
    const res = await fetch('http://127.0.0.1:8000/api/controller/overwrite', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('output file not found');
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
  } catch (err) {
    alert('Error: output file not found.');
  }
}

async function refreshOutput() {
  try {
    const res = await fetch('http://127.0.0.1:8000/api/controller/output');
    if (!res.ok) throw new Error('output file not found');
    const data = await res.json();
    if (data.result === -1) {
      document.getElementById('output').textContent = 'Error: output file not found.';
    } else {
      document.getElementById('output').textContent = data.lines.join('\n') || 'No data.';
    }
  } catch (err) {
    document.getElementById('output').textContent = 'Error: output file not found.';
  }
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
    const res = await fetch("http://127.0.0.1:8000/api/controller/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error('upload failed');
    const data = await res.json();
    if (data.result === -1) {
      document.getElementById("uploadResult").textContent = "Error: input file not found.";
    } else {
      document.getElementById("uploadResult").textContent = data.message || "Upload Complete.";
    }
  } catch (err) {
    document.getElementById("uploadResult").textContent = "Upload failed.";
  }
});
