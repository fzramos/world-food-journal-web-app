import WorldMap from './components/WorldMap';
import WorldHeatMap from './components/WorldHeatMap';
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import './App.css';
import { Icon } from 'leaflet';
import axios from 'axios';
import Button from 'react-bootstrap/Button';

function App() {
  return (
    <>
      <h1>Foods of the World</h1>
      <div className="card">
        <p>🥐🍕🍜</p>{' '}
      </div>
      {/* test Frontend to Backend connection */}
      <Button
        variant="primary"
        onClick={async () => {
          try {
            const res = await axios.post('/api/user/register', {});
            console.log(res.status);
            console.log(res.text);
          } catch (err) {
            console.log(err.message);
          }
        }}
      >
        Sign In
      </Button>
      {/* <WorldMap></WorldMap> */}
      <WorldHeatMap />
    </>
  );
}
export default App;
