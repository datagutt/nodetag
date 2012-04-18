<?php


function encode_array($a) {
  $result = "";
  foreach($a as $e) {
    $result .= pack("C", $e);
  }

  return $result;
}

# Ping request from a rabbit
$data = array(0x7f);

# encode ping interval block
array_push($data, 0x03, 0x00, 0x00, 0x01, 10);

array_push($data, 0xff, 0x0a);
echo encode_array($data);
