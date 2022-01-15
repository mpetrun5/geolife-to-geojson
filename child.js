const v8 = require('v8')
v8.setFlagsFromString('--max_old_space_size=4096')
v8.setFlagsFromString('--max_executable_size=4096')

let fs = require('fs'),
  moment = require('moment'),
  d3 = require('d3'),
  turf = require('turf')

let config = {
  id : false,
  source  : false,
  target  : './EXPORT/',
  simplify: 0.00001,
  recording_gap : 5*60,
  loc_spaceline_threshold : 10,
  loc_spacetime_threshold : 15*60
}

process.on('message', (m) => {
  switch(m.task){
    case 'setId':
      for(let key in config){
        config[key] = m[key]
      }
      process.send({ task: 'init', id: config.id })
    break;
    case 'execute':
      processSubject(m.subject)
    break;
  }
})

let short_key = {
  'Start Time': 'start',
  'End Time': 'end',
  'Transportation Mode': 'activity'
}

let movesTimestamp = {
  long : 'YYYYMMDDTHHmmssZZ',
  short: 'YYYYMMDDTHHmmss',
  date: 'YYYYMMDD'
}

function processSubject(subject) {
  if(subject != '.DS_Store'){

    //Check if labels exists and, if so, parse them
    let labels = false
    let labels_path = config.source + subject + '/labels.txt'
    if (fs.existsSync(labels_path)) {
      labels = []
      label_data = (fs.readFileSync(labels_path, 'utf8')).split('\n')
      let t_labels = label_data[0].split('\t')
      label_data.forEach( (row, i) => {
        if(i > 0){
          if(row.length >= 1){
            let obj = {}
            row = row.split('\t')
            t_labels.forEach((key,ii) => {
              if((ii in row)) obj[short_key[key.trim()]] = (key.indexOf('Time')>=0)?moment(row[ii].split('/').join('-')):row[ii].trim()
            })
            labels.push(obj)
          }
        }
      })
    }
    //Combine all corresponding plts into one long timeline
    let trajectory_path = config.source + subject + '/Trajectory'
    let cTrajectories = [], trajectories = fs.readdirSync(trajectory_path)

    trajectories.forEach( (trajectory) => {
      let trajectory_lines = (fs.readFileSync(trajectory_path + '/' + trajectory, 'utf8')).split('\n')
      trajectory_lines.forEach((line,i) => {
        if(i>5){
          line = line.split(',')
          //check for empty entries
          if(line[5] && line[6]){
            cTrajectories.push(turf.point([parseFloat(line[1]), parseFloat(line[0])]))
          }
        }
      })
    })

    console.log(JSON.stringify(cTrajectories[0]))
    cTrajectories.forEach((trajectory) => {
      fs.appendFileSync(config.target+subject+'.geojson', JSON.stringify(trajectory)+"\n");
    })

    process.send({ task: 'done', id: config.id, activity:(labels)?true:false, name:subject, count:cTrajectories.length, elements:cTrajectories.length })
  }else{
    process.send({task:'ignore', id:config.id })
  }
}
