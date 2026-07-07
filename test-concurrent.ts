import fs from 'fs';

async function run() {
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      fetch('http://localhost:3000/api/public-places')
        .then(res => res.status)
        .catch(err => err.message)
    );
  }
  const results = await Promise.all(promises);
  console.log("Results:", results);
}
run();
