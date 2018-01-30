var app = angular.module("myShoppingList", ["ngRoute"]); 


//sort products
//drag and drop
app.controller("calculatorController", function($scope) {
    $scope.products = ["Milk", "Bread", "Cheese"];
    $scope.addItem = function () {
        $scope.errortext = "";
        $scope.showErr = false;
        if (!$scope.product) {
            $scope.errortext = "Please add a product";
            $scope.showErr = true;
            return;
        }

        if ($scope.products.indexOf($scope.product) == -1) {
            $scope.products.push($scope.product);
            $scope.product = "";
        } else {
            $scope.errortext = "The item is already in your shopping list.";
            $scope.showErr = true;
            $scope.product = "";
        }
    }

    $scope.removeItem = function (x) {  
        
        $scope.products.splice(x, 1);   
        
        if($scope.products.length === 0) {
            $scope.errortext = "The basket is empty";
            $scope.showErr = true;
        } 
    }

});

app.controller("productsController", function($scope) {
    //calculating the price
    $scope.calculate = function  () {
        if($scope.quantity && $scope.price) {
            return parseFloat($scope.quantity) * parseFloat($scope.price);
        } else {
            return "";
        }
    }
});




