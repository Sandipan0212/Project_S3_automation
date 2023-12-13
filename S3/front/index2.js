const imageForm = document.querySelector("#imageForm");
const imageInput = document.querySelector("#imageInput");
const folderSelect = document.querySelector("#folderSelect");

async function fetchFolderLocations() {
  try {
    const response = await fetch('http://localhost:8080/getFolderLocations');
    const data = await response.json();

    data.folderLocations.forEach(location => {
      const option = document.createElement('option');
      option.value = location; 
      option.textContent = location;
      folderSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error fetching folder locations:', error);
  }
}

window.addEventListener('load', fetchFolderLocations);

imageForm.addEventListener("submit", async event => {
  event.preventDefault();

  const file = imageInput.files[0];
  const selectedFolder = folderSelect.value;

  const response = await fetch('http://localhost:8080/s3Url', {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ file: file.name, path: selectedFolder })
  });

  const { url } = await response.json();

  //const uploadUrl = `${url}&key=${encodeURIComponent(selectedFolder + '/' + file.name)}`;

  await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "multipart/form-data"
    },
    body: file
  });
  

  const imageUrl = url.split('?')[0];
  const img = document.createElement("img");
  img.src = imageUrl;
  document.body.appendChild(img);
});  