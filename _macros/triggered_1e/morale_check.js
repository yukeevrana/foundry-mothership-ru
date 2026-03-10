prepMoraleCheck();

//tell the actor to run the function
async function prepMoraleCheck() {
  //determine who to run the macro for
  if (game.settings.get('moshru','macroTarget') === 'character') {
    //is there a selected character? warn if no
    if (!game.user.character || !game.user.character.type === 'ship') {
      //warn player
      game.moshru.noShipSelected();
    } else {
      //run the function for the player's 'Selected Character'
      game.user.character.moraleCheck();
    }
  } else if (game.settings.get('moshru','macroTarget') === 'token') {
    //is there a selected character? warn if no
    if (!canvas.tokens.controlled.length) {
      //warn player
      game.moshru.noShipSelected();
    } else {
      //run the function for all selected tokens
      canvas.tokens.controlled.forEach(function(token){
        token.actor.moraleCheck();
      });
    }
  }
}