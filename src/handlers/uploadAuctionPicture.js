import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import createError from 'http-errors';
import validator from '@middy/validator';
import { getAuctionById } from './getAuction';
import { uploadPictureToS3 } from '../lib/uploadPictureToS3';
import { setAuctionPictureUrl } from '../lib/setAuctionPictureUrl';
import uploadAuctionPictureSchema from '../lib/schemas/uploadAuctionPictureSchema';
import cors from '@middy/http-cors';

export const uploadAuctionPicture = async (event) => {
	const { id } = event.pathParameters;
	const { email } = event.requestContext.authorizer;

	//NOTE Validate auction ownership
	if (auction.seller !== email) {
		throw new createError.Forbidden('You are not the seller of this auction!');
	}

	const auction = await getAuctionById(id);
	const base64 = event.body.replace(/^data:image\/\w+;base64,/, '');
	const buffer = Buffer.from(base64, 'base64');

	let updatedAuction;
	try {
		const pictureUrl = await uploadPictureToS3(auction.id + '.jpg', buffer);
		updatedAuction = await setAuctionPictureUrl(auction.id, pictureUrl);
	} catch (error) {
		console.error(error);
		throw new createError.InternalServerError(error);
	}
	return {
		statusCode: 200,
		body: JSON.stringify(updatedAuction),
	};
};

export const handler = middy(uploadAuctionPicture)
	.use(httpErrorHandler())
	.use(validator({ inputSchema: uploadAuctionPictureSchema }))
	.use(cors());
