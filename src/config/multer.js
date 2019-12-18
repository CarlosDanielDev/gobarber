import multer from 'multer';
import crypto from 'crypto';
import { extname, resolve } from 'path';

export default {
  storage: multer.diskStorage({
    destination: resolve(__dirname, '..', '..', 'tmp', 'uploads'), // acessa o diretório
    filename: (req, file, cb) => {
      // recebe uma função , e aqui fazemos a trataiva do nome do filename
      crypto.randomBytes(16, (err, res) => {
        // gerando no nome de um arquivo baseado em sua extenção
        if (err) return cb(err);

        return cb(null, res.toString('hex') + extname(file.originalname));
      });
    },
  }),
};
