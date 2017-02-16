import React, { useRef} from "react";
import InfinityScrolling from "./components/InfinityScrolling";

// Usage example:
const App = () => {
  const pageSize = 20;
  const spaceSize = 300;
  const containerRef = useRef(window);
  const loadData = (offset, callback) => {
    const pageNumber = offset + 1;
    fetch(
      `https://randomuser.me/api/?page=${pageNumber}&results=${pageSize}&seed=abc`
    )
      .then((response) => response.json())
      .then((data) => callback(pageNumber, data.results, null))
      .catch((error) => callback(null, null, "Loading error!"));
  };
  const renderItem = (item, index) => {
    const { first, last } = item.name;
    return (
      <div key={index} className="item">
        {index}. {first} {last}
      </div>
    );
  };
  return (
    <div className="app">
      <style>{`
              body { height: 300px }
              .content { background: #fff6c8 }
              .barrier { background: #ffc8c8 }
          `}</style>
      <InfinityScrolling
        containerRef={containerRef}
        pageSize={pageSize}
        spaceSize={spaceSize}
        dataLoader={loadData}
        itemRenderer={renderItem}
      />
    </div>
  );
};

export default App;
