import React from 'react';
import {Route} from 'react-router';
import App from './components/App';
import Home from './components/Home';
import AddUser from './components/AddUser';

export default (
  <Route component={App}>
    <Route path='/' component={Home} />
    <Route path='/signup' component={AddUser} />
  </Route>
);
    // <Route path=':category' component={CharacterList}>
    //   <Route path=':race' component={CharacterList}>
    //     <Route path=':bloodline' component={CharacterList} />
    //   </Route>
    // </Route>


