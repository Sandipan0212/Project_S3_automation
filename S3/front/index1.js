const imageForm = document.querySelector("#imageForm")
const imageInput = document.querySelector("#imageInput")

imageForm.addEventListener("submit", async event => {
  event.preventDefault()
  const file = imageInput.files[0]
  const folderPath = 'New/sandip1';
  console.log(file);
  const data={
    file:file.name,
    //path:"a/b"  
  }
  console.log("*********",data)

  // get secure url from our server
  const { url } = await fetch('http://localhost:8080/s3Url',{method:"PUT",
  headers:{
    "Content-Type":"application/json"
  },
  body:JSON.stringify({ file: file.name, path: folderPath })
}).then(res => res.json())
   console.log("urlll",url)


   const uploadUrl = `${url}&key=${encodeURIComponent(folderPath + '/' + file.name)}`;
   console.log("***************",uploadUrl)
  // post the image direclty to the s3 bucket
  await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "multipart/form-data"
    },
    body: file
  })

  const imageUrl = uploadUrl.split('?')[0]
  console.log(imageUrl)

  // post requst to my server to store any extra data
  
  
  const img = document.createElement("img")
  img.src = imageUrl
  document.body.appendChild(img)
})