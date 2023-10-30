import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1>Foods of the World</h1>
      <div className="card">
        <p>🥐🍕🍜</p>
      </div>
    </>
  );
}

export default App;
