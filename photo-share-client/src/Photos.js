import React from 'react'
import { Query } from 'react-apollo'
import { ROOT_QUERY } from './App'

const Photos = () =>
    <Query query={ROOT_QUERY}>
        {({ loading, data }) => loading ?
            <p>loading...</p> :
            (<div id="loaded-photos">
                {data.allPhotos.map(photo =>
                    <img key={photo.id} src={`http://localhost:4000${photo.url}`} alt={photo.name} width={350} />)}
            </div>)

        }
    </Query>

export default Photos