'use strict';

process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

const webpack = require('webpack');
const config = require('../config/webpack.config');

function printErrorDetails(err, stats) {
  if (err) {
    console.error('Webpack compilation error:');
    if (err.stack) console.error(err.stack);
    if (err.message) console.error('Message:', err.message);
    // Print all enumerable properties
    for (const key in err) {
      if (Object.prototype.hasOwnProperty.call(err, key)) {
        console.error(`${key}:`, err[key]);
      }
    }
  }
  if (stats) {
    console.error('Webpack Stats:', stats.toString({ colors: true, all: true }));
  }
}

// Create the production build and print the deployment instructions.
function build() {
  console.log('Creating an optimized production build for the extension...');

  const compiler = webpack(config);
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        printErrorDetails(err, stats);
        return reject(err);
      }

      const messages = stats.toJson({ all: false, warnings: true, errors: true });
      
      if (messages.errors.length) {
        // Only keep the first error. Others are often indicative
        // of the same problem, but confuse the reader with noise.
        if (messages.errors.length > 1) {
          messages.errors.length = 1;
        }
        printErrorDetails(new Error(messages.errors.join('\n\n')), stats);
        return reject(new Error(messages.errors.join('\n\n')));
      }

      if (messages.warnings.length) {
        console.log('Compiled with warnings.\n');
        console.log(messages.warnings.join('\n\n'));
      } else {
        console.log('Compiled successfully.\n');
      }

      return resolve({
        stats,
        warnings: messages.warnings,
      });
    });
  });
}

build().catch(err => {
  console.log('Failed to compile.\n');
  // Error details already printed above
  process.exit(1);
}); 