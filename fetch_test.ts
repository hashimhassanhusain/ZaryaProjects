import fs from 'fs';

async function run() {
  const fileData = fs.readFileSync('package.json');
  const blob = new Blob([fileData], { type: 'application/json' });
  
  const fd = new FormData();
  fd.append('uploadId', 'test1234');
  fd.append('index', '0');
  fd.append('chunk', blob, 'chunk.bin');

  const res = await fetch('http://localhost:3000/api/drive/upload-chunk', {
    method: 'POST',
    body: fd
  });
  console.log(res.status, await res.text());
}
run();
