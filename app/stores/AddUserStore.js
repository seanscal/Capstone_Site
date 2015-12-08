import alt from '../alt';
import AddUserActions from '../actions/AddUserActions';

class AddUserStore {
  constructor() {
    this.bindActions(AddUserActions);
    this.name = '';
    this.email = '';
    this.helpBlock = '';
    this.nameValidationState = '';
    this.emailValidationState = '';
  }

  onAddUserSuccess(successMessage) {
    this.nameValidationState = 'has-success';
    this.helpBlock = successMessage;
  }

  onAddUserFail(errorMessage) {
    this.nameValidationState = 'has-error';
    this.helpBlock = errorMessage;
  }

  onUpdateName(event) {
    this.name = event.target.value;
    this.nameValidationState = '';
    this.helpBlock = '';
  }

  onUpdateEmail(event) {
    this.email = event.target.value;
    this.emailValidationState = '';
  }

  onInvalidName() {
    this.nameValidationState = 'has-error';
    this.helpBlock = 'Please enter a User name.';
  }

  onInvalidEmail() {
    this.emailValidationState = 'has-error';
    this.helpBlock = 'Please enter an email.';
  }
}

export default alt.createStore(AddUserStore);