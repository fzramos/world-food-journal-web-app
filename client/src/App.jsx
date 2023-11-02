import WorldMap from './components/WorldMap';
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import './App.css';
import { Icon } from 'leaflet';

function App() {
  return (
    <>
      <h1>Foods of the World</h1>
      <div className="card">
        <p>🥐🍕🍜</p>{' '}
      </div>
      <WorldMap></WorldMap>
    </>
  );
}
export default App;