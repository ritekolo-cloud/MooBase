import app from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 MooBase Server running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`);
});

process.on('unhandledRejection', (err: any) => {
  console.log('❌ UNHANDLED REJECTION! 💥 Shutting down server...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
export default server;
