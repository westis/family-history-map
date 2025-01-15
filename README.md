# Family History Map

An interactive visualization of family history using geographical data from GEDCOM files.

## Features

- Upload and parse GEDCOM files
- Interactive map visualization of family events
- Filter events by type (Birth, Death, Residence)
- Search and select root person
- View family relationships
- Timeline filtering
- Marker clustering for better visualization

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

1. Click "Upload GEDCOM" to load your family history data
2. Use the timeline slider to filter events by year
3. Toggle event types using the Birth/Death/Living buttons
4. Select a root person to view family relationships
5. Click markers on the map to view person details
6. Use the relationship filters to focus on ancestors or descendants

## Development

- Built with Next.js 15
- Uses React Leaflet for mapping
- Implements shadcn/ui components
- Deployed on GitHub Pages

## Deployment

The site is automatically deployed to GitHub Pages when changes are pushed to the main branch.

Visit [https://westis.github.io/family-history-map](https://westis.github.io/family-history-map) to see the live version.

## License

MIT
