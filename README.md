# Sum AI Chrome Extension

A Chrome extension built with React and TypeScript.

## Development

1. Clone this repository
2. Install dependencies:
```bash
npm install
```
3. Start the development server:
```bash
npm start
```

## Building the Extension

1. Create a production build:
```bash
npm run build
```1
2. The build will be created in the `build` directory

## Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the `build` directory from this project
4. The extension should now appear in your Chrome toolbar

## Features

- React-based popup interface
- TypeScript support
- Modern development environment

## Project Structure

- `public/manifest.json`: Chrome extension manifest file
- `src/App.tsx`: Main popup component
- `src/index.tsx`: Entry point
- `config/`: Build and webpack configuration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
