import dotenv from 'dotenv';
dotenv.config();

await import('./config/validateEnv.js');
const { default: app } = await import('./app.js');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Spyder running on http://localhost:${PORT}`);
});
