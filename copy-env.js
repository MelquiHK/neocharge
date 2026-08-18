import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envLocalPath = path.resolve('.env.local');
const examplePath = path.resolve('.env.example');

if (!fs.existsSync(envPath) && !fs.existsSync(envLocalPath)) {
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log('.env.example was copied to .env because no environment files were found.');
  } else {
    console.warn('.env.example not found. Please create a .env file manually.');
  }
} else {
  console.log('Environment file .env or .env.local already exists.');
}
