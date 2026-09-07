import { createRequire } from 'module'; const require=createRequire(import.meta.url)
import fs from 'node:fs'
const PdfPrinter=require('pdfmake'); const vfs=require('pdfmake/build/vfs_fonts')
const B=n=>Buffer.from(vfs[n],'base64')
const pr=new PdfPrinter({Roboto:{normal:B('Roboto-Regular.ttf'),bold:B('Roboto-Medium.ttf'),italics:B('Roboto-Italic.ttf'),bolditalics:B('Roboto-MediumItalic.ttf')}})
const url='https://bkdupkjrafaprvdseued.supabase.co/storage/v1/object/public/vhjscvpp-images/config/logo-1788742146327.png'
const rr=await fetch(url); const lb=Buffer.from(await rr.arrayBuffer()); const logo='data:image/png;base64,'+lb.toString('base64')
const phieu={nguoi_de_nghi_ten:'Trần Thị Mai Dung',phong_ban_ten:'Phòng Hành chính Nhân sự',truong_bo_phan:'Trần Thị Mai Dung',thang:'2026-09',tieu_de:'Mua sắm văn phòng phẩm, tài sản, thiết bị tháng 09/2026 cho Phòng Hành chính Nhân sự',thoi_gian_can:'15/09/2026',ke_hoach_su_dung:'1 tháng (hoặc tới khi dùng hết)',created_at:'2026-09-07'}
const rows=[['Giấy in A4 Bãi Bằng ĐL70/90 vỏ trắng(tem)','ream',1],['Bìa A4 vân thơm ĐL160','ream',1],['Bút bi Thiên Long 079 (Xanh, đen, đỏ)','chiếc',1]].map(([ten_hang,dvt,so_luong])=>({ten_hang,dvt,so_luong,ghi_chu:null}))
const soDong=rows.length; const canGiua=Math.max(4,Math.round((soDong-1)*11))
const th=['TT','Tên TTB/VPP','Đơn vị tính','Số lượng','Thời gian cần','Kế hoạch sử dụng','Ghi chú'].map(t=>({text:t,bold:true,fillColor:'#eef2f7',alignment:'center',fontSize:9}))
const body=[th]
rows.forEach((d,i)=>{const r=[{text:String(i+1),alignment:'center',fontSize:9},{text:d.ten_hang,fontSize:9},{text:d.dvt,alignment:'center',fontSize:9},{text:String(d.so_luong),alignment:'center',fontSize:9}];if(i===0){r.push({text:phieu.thoi_gian_can,alignment:'center',fontSize:9,rowSpan:soDong,margin:[0,canGiua,0,0]});r.push({text:phieu.ke_hoach_su_dung,alignment:'center',fontSize:9,rowSpan:soDong,margin:[0,canGiua,0,0]})}else{r.push({});r.push({})}r.push({text:'',fontSize:9});body.push(r)})
const ng=new Date(phieu.created_at); const dia=`Hà Nội, ngày ${String(ng.getDate()).padStart(2,'0')} tháng ${String(ng.getMonth()+1).padStart(2,'0')} năm ${ng.getFullYear()}`
const doc={pageSize:'A4',pageMargins:[40,36,40,40],defaultStyle:{font:'Roboto',fontSize:11},content:[
{columns:[{width:128,stack:[{image:logo,width:105}]},{width:'*',stack:[{text:'ĐỀ XUẤT MUA VĂN PHÒNG PHẨM,',bold:true,alignment:'center',fontSize:12},{text:'TRANG THIẾT BỊ,',bold:true,alignment:'center',fontSize:12},{text:'TÀI SẢN VĂN PHÒNG',bold:true,alignment:'center',fontSize:12}]},{width:128,fontSize:8,alignment:'right',stack:[{text:'BM01/QLTS/04-HCNS',bold:true},{text:'Ngày ban hành: 01/12/2011'},{text:'Lần sửa đổi: Lần 1'}]}]},
{columns:[{width:52,text:'Kính gửi:'},{width:'*',stack:[{text:'- Ban Giám đốc;'},{text:'- Phòng Hành chính Nhân sự.'}]}],margin:[0,14,0,0]},
{text:[{text:'Người đề nghị: ',bold:true},phieu.nguoi_de_nghi_ten],margin:[0,8,0,0]},
{text:[{text:'Bộ phận: ',bold:true},phieu.phong_ban_ten]},
{text:[{text:'Đề nghị: ',bold:true},phieu.tieu_de],margin:[0,0,0,10]},
{table:{headerRows:1,widths:[22,'*',45,42,52,66,58],body},layout:{hLineColor:()=>'#555',vLineColor:()=>'#555',hLineWidth:()=>0.7,vLineWidth:()=>0.7,paddingLeft:()=>4,paddingRight:()=>4,paddingTop:()=>4,paddingBottom:()=>4}},
{columns:[{width:'*',text:''},{width:230,text:dia,alignment:'center',italics:true}],margin:[0,14,0,0]},
{columns:[{width:'*',text:'BAN GIÁM ĐỐC',alignment:'center',bold:true,fontSize:10},{width:'*',text:'PHÒNG HCNS',alignment:'center',bold:true,fontSize:10},{width:'*',text:'TRƯỞNG BỘ PHẬN',alignment:'center',bold:true,fontSize:10},{width:'*',text:'NGƯỜI ĐỀ NGHỊ',alignment:'center',bold:true,fontSize:10}],margin:[0,8,0,0]},
{columns:[{width:'*',text:''},{width:'*',text:''},{width:'*',text:phieu.truong_bo_phan,alignment:'center',margin:[0,46,0,0],fontSize:10},{width:'*',text:phieu.nguoi_de_nghi_ten,alignment:'center',margin:[0,46,0,0],fontSize:10}]}
]}
const pd=pr.createPdfKitDocument(doc);const ch=[];pd.on('data',c=>ch.push(c));pd.on('end',()=>{fs.writeFileSync(new URL('./BM01_mau_thu3.pdf',import.meta.url),Buffer.concat(ch));console.log('OK')});pd.end()
