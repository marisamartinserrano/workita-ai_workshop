import express from 'express';

const app = express();
const port = process.env.PORT ?? '8080';

app.get('/', (_req, res) => {
  res.send('Hello World');
});

app.listen(Number(port), () => {
  console.log(`Workita running on http://localhost:${port}`);
});
