import React, { useState } from 'react';
import {
  Marker,
  Popup,
  MapContainer,
  TileLayer,
  useMap,
  GeoJSON,
} from 'react-leaflet';
import _ from 'lodash';
import countriesGeoJSON from '../assets/countriesgeo.json';

const WorldHeatMap = () => {
  const [center, setCenter] = useState([51.505, -0.09]);
  const [focusedCountryName, setFocusedCountryName] = useState('');
  const [countryCounts, setCountryCounts] = useState({
    USA: 4,
    FRA: 5,
    ZAF: 10,
  });

  const styleFunction = (feature) => {
    const countryId = feature.properties.ISO_A3;
    // const countryVal = countryCounts[countryId];
    const countryVal = _.get(countryCounts, countryId, 0);
    // console.log;

    // this code turns everything black without value
    // then remove the black if countryCount has a value
    const fillColor = `rgb(${countryVal * 255}, 0, 0)`;
    const fillOpacity = countryVal / 100;

    // want opacity to be 0 by default and 30 otherwise
    //
    // const fillColor = `rgb(${countryVal * 255}, 0, 0)`;

    return {
      fillColor,
      fillOpacity,
    };
  };

  const updateCountryCounts = (countryId) => {
    let idVal = _.get(countryCounts, countryId, 0);
    idVal++;
    console.log(`${countryId}: ${idVal}`);
    _.set(countryCounts, countryId, idVal);
  };

  const onEachFeature = (feature, layer) => {
    const countryName = feature.properties.ADMIN;
    const countryVal = _.get(countryCounts, feature.properties.ISO_A3, 0);

    if (feature.properties) {
      // layer.bindPopup('Wow!');
      layer.bindTooltip(`${countryName}: ${countryVal}`);
    }
    layer.on({
      // mouseover:
      // mouseout:
      click: onCountryClick,
    });
  };
  const onCountryClick = (e) => {
    setFocusedCountryName(e.target.feature.properties.ADMIN);
    console.log(e.target.feature.properties.ADMIN);
    console.log(focusedCountryName);

    updateCountryCounts(e.target.feature.properties.ISO_A3);
  };

  // TODO: Problem: MapContainer and GeoJSON don't auto re-render when state chagnes
  // SOLUTION 1: add a KEY component to both and set it to a state
  // SOLUTION 2: componentDidMount and forceReload
  // SOLUTION 3: useRef, ref in GeoJSON,
  return (
    <MapContainer center={center} zoom={3} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={center} onClick={() => console.log('yes')}>
        <Popup>You are here!</Popup>
      </Marker>
      <GeoJSON
        key={focusedCountryName}
        data={countriesGeoJSON}
        onEachFeature={onEachFeature}
        style={styleFunction}
        // opacity={0}
      />
    </MapContainer>
  );
};

export default WorldHeatMap;
