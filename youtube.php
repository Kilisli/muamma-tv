<?php
$chanel = "UCvFudBDDILdDljN4VIZ4Msw"; // TRT1 kanal ID'si istediğiniz bir kanalın ID'si ile değiştirin
$apiKey = "API-KIMLIGINI-YAZ"; // Google'dan aldığınız API kimliği

function get_contents($Url) {
	if (!function_exists('curl_init')){
		die('CURL yüklü değil!');
	}
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $Url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	$output = curl_exec($ch);
	curl_close($ch);
return $output;
}

$chanelAdress = "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=". $chanel ."&key=". $apiKey;
$chanelVeri = json_decode(get_contents($chanelAdress));

if(!array_key_exists('items', $chanelVeri)){
	
	//Kota dolu o zaman varsayılan vıdeo oynatılsın( Youtube API günlük aylık ve anlık bazında bazı kotalarla sınırlandırılmıştır )
	// https://console.developers.google.com adresinden kota durumunu kontrol edebilirsiniz
	echo '<div id="uyari">Youtube API Kotanız doldu https://console.developers.google.com adresinden kota durumunu kontrol edebilirsiniz.</div><br>';
	echo '<iframe id="trt1" width="640" height="360" src="https://www.youtube.com/embed/4yXJBAhn0Q4?autoplay=1" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
	
} else {
	
$chanelID = $chanelVeri->items[0]->id;
$videoAdres = "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=". $chanelID ."&eventType=live&type=video&key=". $apiKey;
$videoVeri = json_decode(get_contents($videoAdres));

if(isset($_GET["canlikontrol"])){
	echo get_contents($videoAdres);
	exit();
}

if(count($videoVeri->items) > 0){
	
	$yenivideoID = $videoVeri->items[0]->id->videoId;	
	
	echo '<div id="uyari">Yayın canlı!</div><br>';
	// adres sonundaki ?autoplay=1 otomatik başlaması için istemiyorsanız kaldırın
	echo '<iframe id="trt1" width="640" height="360" src="https://www.youtube.com/embed/'. $yenivideoID .'?autoplay=1" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
	//yenile değişkeni false yayın var artık yenilemesin
	echo '<script type="text/javascript">yenile = false;</script>';
	
} else {	

	$uploads = $chanelVeri->items[0]->contentDetails->relatedPlaylists->uploads;
	$sonvideoAdres = "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=".$uploads."&key=". $apiKey;
	$sonvideoVeri = json_decode(get_contents($sonvideoAdres));
	
	// Bu kısımda yayın yoksa gösterilecek olan video kodları eklenebilir, veritabanından çekilebilir, Alttaki kodlar olduğu gibi kalırsa kanala eklenen son videoyu çeker
	if(count($sonvideoVeri->items) > 0){
		$sonyenivideoID = $sonvideoVeri->items[0]->snippet->resourceId->videoId;
		echo '<div id="uyari">Yayın yok son video oynatılıyor</div><br>';
		echo '<iframe id="trt1" width="640" height="360" src="https://www.youtube.com/embed/'. $sonyenivideoID .'?autoplay=1" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
	} else {
		//Yayın yok ve son video alınamadı varsayılan video
		echo '<div id="uyari">Yayın yok ve son video alınamadı varsayılan video!</div><br>';
		echo '<iframe id="trt1" width="640" height="360" src="https://www.youtube.com/embed/4yXJBAhn0Q4?autoplay=1" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
		echo '<script type="text/javascript">yenile = false;</script>';
	}
	
}

}

//YayinKontrol functionu sayfa ilk yüklendiğinde 1 defa tetikleyelim
echo '<script type= "text/javascript">$(document).ready(function () { YayinKontrol(); });</script>';
?>