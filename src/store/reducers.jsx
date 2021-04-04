/* eslint-disable no-return-assign */
/* eslint-disable no-case-declarations */
import { v1 as uuidv1 } from 'uuid';

import {
  LOGIN_ADMIN, LOGIN_ADMIN_FAIL, LOGOUT_ADMIN,
  CHANGE_HOURS, ADD_USER, DELETE_USER, UPDATE_USER,
  LOGIN_USER, LOGIN_USER_FAIL, LOGOUT_USER, CHANGE_AVAILABILITY,
  CHANGE_PIN, NO_PUNCH_OUT, SET_REDUCER_STATE, setReducerState,
} from './actions';

let lastId = -1;

function threeDigit(myNumber) {
  const formattedNumber = myNumber.toLocaleString('en-US', {
    minimumIntegerDigits: 3,
    useGrouping: false,
  });
  return formattedNumber;
}

let newRecord;

function strToMins(t) {
  const s = t.split(':');
  return Number(s[0]) * 60 + Number(s[1]);
}

function minsToStr(t) {
  return `${Math.trunc(t / 60)}:${(`00${t % 60}`).slice(-2)}`;
}

const initialState = {
  admin: {
    id: 'admin',
    pin: '1111',
  },
  users: [],
  isAdminLoggedin: JSON.parse(localStorage.getItem('isAdminLoggedin')) || false,
  isUserLoggedin: false,
  incorrectAdminCredentials: false,
  incorrectUserCredentials: false,
  currentUser: '',
  minWorkHours: '9',
  officeStartHours: '09:00',
  officeEndHours: '18:00',
  lastIdReached: false,
};

export const rootReducer = (state = initialState, action) => {
  const currentUser = state.users.find((user) => user.id === state.currentUser.id);
  switch (action.type) {
    case LOGIN_ADMIN:
      localStorage.setItem('isAdminLoggedin', JSON.stringify(action.payload.isAdminLoggedin));
      return {
        ...state,
        ...action.payload,
        incorrectAdminCredentials: false,
      };
    case LOGIN_ADMIN_FAIL:
      return { ...state, incorrectAdminCredentials: true };
    case LOGOUT_ADMIN:
      localStorage.clear();
      return { ...state, isAdminLoggedin: false };
    case ADD_USER:
      lastId += 1;
      if (lastId === 999) {
        let lIdR = state.lastIdReached;
        // eslint-disable-next-line no-unused-vars
        lIdR = true;
      }
      return { ...state, users: [...state.users, { id: (`${action.payload.department}-${threeDigit(lastId)}`), pin: '0000', ...action.payload }] };
    case DELETE_USER:
      const newUsers = state.users.filter((user) => user.id !== action.payload.id);
      return { ...state, users: newUsers };
    case UPDATE_USER:
      const updateUser = state.users.find((user) => user.id === action.payload.id);
      updateUser.firstname = action.payload.firstname;
      updateUser.lastname = action.payload.lastname;
      updateUser.email = action.payload.email;
      updateUser.department = action.payload.department;
      updateUser.role = action.payload.role;
      return { ...state };
    case CHANGE_HOURS:
      let minHr = state.minWorkHours;
      const endHr = action.payload.officeEndHours;
      const startHr = action.payload.officeStartHours;
      minHr = parseInt(endHr, 10) - parseInt(startHr, 10);
      return { ...state, ...action.payload, minWorkHours: minHr };
    case LOGIN_USER:
      newRecord = true;
      return {
        ...state,
        ...action.payload,
        isUserLoggedin: true,
        incorrectUserCredentials: false,
      };
    case LOGIN_USER_FAIL:
      return { ...state, incorrectUserCredentials: true };
    case LOGOUT_USER:
      return { ...state, isUserLoggedin: false, currentUser: '' };
    case CHANGE_AVAILABILITY:
      const newObj = {
        date: new Date().toLocaleDateString(), timeIn: '', timeOut: '', workHours: '', id: uuidv1(),
      };
      if (newRecord) {
        const { records } = state.users.find((user) => user.id === state.currentUser.id);
        if (records.length === 0) {
          records.push(newObj);
        }
        if (records[records.length - 1].date !== new Date().toLocaleDateString()) {
          records.push(newObj);
        }
        newRecord = false;
      }
      currentUser.available = action.payload;
      const alrERec = currentUser.records
        .find((record) => record.date === new Date().toLocaleDateString());
      if (action.payload === 'Available' && currentUser.records.length > 0) {
        alrERec.timeIn = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      } else if (currentUser.records.length > 0) {
        if (currentUser.records[currentUser.records.length - 1].timeOut === '') {
          alrERec.timeOut = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          alrERec.workHours = minsToStr(strToMins(alrERec.timeOut) - strToMins(alrERec.timeIn));
        }

        if (currentUser.records[currentUser.records.length - 1].timeIn !== '') {
          const sum = currentUser.records
          // eslint-disable-next-line no-param-reassign
            .reduce((acc, record) => acc += parseInt(record.workHours, 10), 0);
          currentUser.avgWorkHours = sum / currentUser.records.length;
        }
      }
      return { ...state };
    case CHANGE_PIN:
      return { ...state, ...action.payload };
    case NO_PUNCH_OUT:
      if (state.currentUser.records.length > 0) {
        if (state.currentUser.records[state.currentUser.records.length - 1].timeOut === '') {
          state.currentUser.records.pop();
        }
      }
      currentUser.available = 'Not Available';
      return { ...state };
    case SET_REDUCER_STATE:
      console.log('IN-REDUCER', (action.payload));
      return (action.payload);
    default:
      return state;
  }
};

// eslint-disable-next-line no-unused-vars
export const loadGistData = () => async (dispatch, getState) => {
  const req = await fetch('https://api.github.com/gists/b16b6fd67c637e4ca465b566a09b1032');
  const gist = await req.json();
  const gistData = JSON.parse(gist.files['db.json'].content);
  dispatch(setReducerState(gistData));
};

/*
async function getData() {
  const req = await fetch('https://api.github.com/gists/b16b6fd67c637e4ca465b566a09b1032');
  const gist = await req.json();
  const gistData = JSON.parse(gist.files['db.json'].content);
  console.log(gistData);
  return gistData;
}
*/
