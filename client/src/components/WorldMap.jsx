import React, { useState } from 'react';
import {
  Marker,
  Popup,
  MapContainer,
  TileLayer,
  useMap,
  GeoJSON,
} from 'react-leaflet';
import countriesGeoJSON from '../assets/countriesgeo.json';

const WorldMap = () => {
  const [center, setCenter] = useState([51.505, -0.09]);
  const [countryName, setCountryName] = useState('');

  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      layer.bindPopup('Wow!');
    }
    layer.on({
      // mouseover:
      // mouseout:
      click: onCountryClick,
    });
  };
  const onCountryClick = (e) => {
    console.log(e.target.feature.properties.ADMIN);
  };

  return (
    <MapContainer center={center} zoom={3} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={center} onClick={() => console.log('yes')}>
        <Popup>You are here!</Popup>
      </Marker>
      <GeoJSON data={countriesGeoJSON} onEachFeature={onEachFeature} />
    </MapContainer>
  );
};

export default WorldMap;
