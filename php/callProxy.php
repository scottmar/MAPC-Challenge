<?php
include '../../php/cartoDBProxy.php';

$queryURL = $_POST['qurl'];
$return = goProxy($queryURL);
echo $return;
?>