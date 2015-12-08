import alt from '../alt';

class AddUserActions {
  constructor() {
    this.generateActions(
      'addUserSuccess',
      'addUserFail',
      'updateName',
      'updateEmail',
      'invalidName',
      'invalidEmail'
    );
  }

  addUser(name, email) {
    $.ajax({
      type: 'POST',
      url: '/api/users',
      data: { name: name, email: email }
    })
      .done((data) => {
        this.actions.addUserSuccess(data.message);
      })
      .fail((jqXhr) => {
        this.actions.addUserFail(jqXhr.responseJSON.message);
      });
  }
}

export default alt.createActions(AddUserActions);