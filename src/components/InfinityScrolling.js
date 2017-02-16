import { useEffect, useMemo, useRef, useState } from "react";

// Calculates element's absolute position.
//
const calculateOffset = (element) => {
  if (element instanceof Window) {
    return 0;
  }
  let result = 0;
  while (element) {
    const value = element.offsetTop;
    if (value) {
      result += value;
    }
    element = element.offsetParent; // jumps to the next proper parent element
  }
  return result;
};

// Calculates space between elements.
//
const calculateSpace = (aElement, bElement) => {
  const aOffset = calculateOffset(aElement);
  const bOffset = calculateOffset(bElement);
  return bOffset - aOffset;
};

// Calculates container's scroll position.
//
const calculateScroll = (container) => {
  return container.scrollY || container.scrollTop || 0;
};

// Calculates container's inner height.
//
const calculateHeight = (container) => {
  return container.innerHeight || container.clientHeight || 0;
};

// Checks barrier visibility inside container.
//
const checkVisibility = (container, barrier, space) => {
  const barrierTop = calculateSpace(container, barrier);
  const containerScroll = calculateScroll(container);
  const containerHeight = calculateHeight(container);
  if (barrierTop < containerScroll + containerHeight + space) {
    return true;
  }
  return false;
};

// Creates logic that lets to track and control data loading using infinite scolling logic.
//
const createManager = ({
  offset: _offset,
  space: _space,
  loader: _loader,
  container: _container,
  content: _content,
  barrier: _barrier,
  onLoading: _onLoading,
  onLoaded: _onLoaded,
  onError: _onError,
}) => {
  let _destroyed = false;
  let _enabled = false;
  let _loading = false;
  const signal = () => {
    if (_loading) {
      return;
    }
    if (
      _container.current == null ||
      _barrier.current == null ||
      checkVisibility(_container.current, _barrier.current, _space)
    ) {
      _loading = true;
      if (_onLoading) {
        _onLoading();
      }
      const callback = (offset, data, error) => {
        if (_enabled) {
          _loading = false;
          try {
            if (error) {
              _onError(error);
            } else {
              _offset = offset;
              if (_onLoaded) {
                _onLoaded(offset, data);
                if (_enabled === false) {
                  return;
                }
              }
              if (data && data.length > 0) {
                setTimeout(signal);
              }
            }
          } catch (e) {
            console.error(e);
          }
        }
      };
      try {
        _loader(_offset, callback);
      } catch (e) {
        _loading = false;
        if (_onError) {
          _onError("Loading error.");
        }
      }
    }
  };
  return {
    signal: () => {
      if (_destroyed) {
        throw new Error("Object has been destroyed.");
      }
      if (_enabled) {
        signal();
      }
    },
    enable: () => {
      if (_destroyed) {
        throw new Error("Object has been destroyed.");
      }
      if (_enabled) {
        return;
      }
      _enabled = true;
      _container.current.addEventListener("scroll", signal, false);
      signal();
    },
    disable: () => {
      if (_destroyed) {
        throw new Error("Object has been destroyed.");
      }
      if (_enabled) {
        _enabled = false;
        _container.current.removeEventListener("scroll", signal, false);
      }
    },
    destroy: () => {
      if (_destroyed) {
        return;
      }
      _destroyed = true;
      _enabled = false;
      _container.current.removeEventListener("scroll", signal, false);
    },
  };
};

// Creates function proxy (Source: https://dirask.com/snippets/jmJNN1).
//
const createProxy = () => {
  const state = {
    wrapper: (...args) => {
      if (state.action) {
        return state.action(...args);
      }
      return undefined;
    },
    action: null,
  };
  return state;
};

// Privides proxy hook (Source: https://dirask.com/snippets/jmJNN1).
//
const useProxy = (action) => {
  const proxy = useMemo(createProxy, []);
  proxy.action = action;
  return proxy.wrapper;
};

// Component that implements infinite scolling logic.
//
const InfinityScrolling = ({
  containerRef,
  pageSize = 20,
  spaceSize = 100,
  dataLoader,
  itemRenderer,
}) => {
  const contentRef = useRef(null);
  const barrierRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const [pages, setPages] = useState(null);
  const [state, setState] = useState(null);
  const loaderProxy = useProxy(dataLoader);
  const manager = useMemo(() => {
    return createManager({
      offset: offset,
      space: spaceSize,
      loader: loaderProxy,
      container: containerRef,
      content: contentRef,
      barrier: barrierRef,
      onLoading: () => {
        setState("Loading...");
      },
      onLoaded: (offset, items) => {
        if (items.length > 0) {
          setOffset(offset);
          setPages((page) => (page ? [...page, items] : [items]));
        }
        if (items.length < pageSize) {
          setState(null);
          manager.disable();
        } else {
          setState("Click me to continue loading...");
        }
      },
      onError: (error) => {
        setState("Loading error! (click me to continue)");
      },
    });
  }, [containerRef]);
  useEffect(() => {
    manager.enable();
    return () => {
      manager.disable();
    };
  }, [containerRef]);
  const handleClick = () => manager.signal();
  return (
    <div className="wrapper">
      {pages && (
        <div ref={contentRef} className="content">
          {pages.map((items, index) => {
            return (
              <div key={index} className="page">
                {items.map(itemRenderer)}
              </div>
            );
          })}
        </div>
      )}
      {state && (
        <div ref={barrierRef} className="barrier" onClick={handleClick}>
          {state}
        </div>
      )}
    </div>
  );
};

export default InfinityScrolling;
